/**
 * Implementaciones simuladas de todos los adaptadores.
 *
 * Ninguna hace una peticion de red. Cada una devuelve resultados coherentes y
 * deja constancia de que es una simulacion, tanto en el identificador que
 * graba en los registros como en la etiqueta "Modo demostracion" que las
 * pantallas de pago muestran.
 */

import type {
  AdaptadorArchivos,
  AdaptadorBanco,
  AdaptadorFiscal,
  AdaptadorMensajeria,
  AdaptadorMfa,
  AdaptadorTasa,
  Adaptadores,
  IntencionPago,
  Mensaje,
  ResultadoFactura,
  ResultadoPago,
  SolicitudFactura,
} from './index';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Codigo unico de MFA en la demo. Documentado en el README, sin secretos. */
export const CODIGO_MFA_DEMO = '123456';

// ---------------------------------------------------------------------------

class BancoSimulado implements AdaptadorBanco {
  readonly id = 'banco.simulado';
  readonly descripcion = 'Banco de demostracion. No hay conexion bancaria real.';
  readonly simulado = true;

  /** Registro de claves ya atendidas: garantiza idempotencia. */
  private atendidas = new Map<string, ResultadoPago>();

  async crearIntencion(i: IntencionPago): Promise<ResultadoPago> {
    const previo = this.atendidas.get(i.claveIdempotencia);
    if (previo) return previo;

    await espera(400);

    let resultado: ResultadoPago;

    if (i.metodo === 'efectivo') {
      // El efectivo se confirma en el punto, no por el banco.
      resultado = {
        estado: 'confirmado',
        referencia: `EFE-${Date.now().toString(36).toUpperCase()}`,
        confirmadoEn: new Date().toISOString(),
        adaptador: 'caja.local',
      };
    } else if (i.referencia && /^0{4,}$/.test(i.referencia)) {
      // Referencia de prueba reservada para forzar el caso de fallo.
      resultado = { estado: 'fallido', motivo: 'La referencia no fue encontrada en el banco emisor.', adaptador: this.id };
    } else if (i.metodo === 'tarjeta') {
      resultado = {
        estado: 'confirmado',
        referencia: `TAR-${Date.now().toString(36).toUpperCase()}`,
        confirmadoEn: new Date().toISOString(),
        adaptador: this.id,
      };
    } else {
      // Pago Movil y transferencia nacen pendientes de verificacion: el
      // documento advierte que nunca debe aceptarse la captura como prueba.
      resultado = {
        estado: 'pendiente_verificacion',
        referencia: i.referencia || `REF-${Date.now().toString(36).toUpperCase()}`,
        adaptador: this.id,
      };
    }

    this.atendidas.set(i.claveIdempotencia, resultado);
    return resultado;
  }

  async verificar(referencia: string): Promise<ResultadoPago> {
    await espera(600);
    if (/^0{4,}$/.test(referencia)) {
      return { estado: 'fallido', motivo: 'El banco no reporta un movimiento con esa referencia.', adaptador: this.id };
    }
    return {
      estado: 'confirmado',
      referencia,
      confirmadoEn: new Date().toISOString(),
      adaptador: this.id,
    };
  }

  async revertir(_referencia: string, _motivo: string): Promise<{ ok: boolean; adaptador: string }> {
    await espera(300);
    return { ok: true, adaptador: this.id };
  }
}

// ---------------------------------------------------------------------------

class FiscalSimulado implements AdaptadorFiscal {
  readonly id = 'fiscal.simulado';
  readonly descripcion =
    'Proveedor de facturacion de demostracion. El documento generado es de prueba y lo emite el comercio, no INPARQUES.';
  readonly simulado = true;

  private secuencia = 1000;

  async emitir(_s: SolicitudFactura): Promise<ResultadoFactura> {
    await espera(500);
    this.secuencia += 1;
    return {
      numero: `00-${this.secuencia}`,
      numeroControl: `CTRL-${this.secuencia}`,
      emitidaEn: new Date().toISOString(),
      adaptador: this.id,
    };
  }

  async notaDeCredito(_facturaId: string, _motivo: string): Promise<ResultadoFactura> {
    await espera(400);
    this.secuencia += 1;
    return {
      numero: `NC-${this.secuencia}`,
      numeroControl: `CTRL-NC-${this.secuencia}`,
      emitidaEn: new Date().toISOString(),
      adaptador: this.id,
    };
  }
}

// ---------------------------------------------------------------------------

class MensajeriaSimulada implements AdaptadorMensajeria {
  readonly id = 'mensajeria.simulada';
  readonly descripcion = 'No envia correos, SMS ni WhatsApp. Los mensajes quedan en una bandeja local visible en la demo.';
  readonly simulado = true;

  private mensajes: Mensaje[] = [];

  async enviar(m: Mensaje) {
    this.mensajes.push(m);
    return { ok: true as const, registradoEn: new Date().toISOString(), adaptador: this.id };
  }

  bandeja(): Mensaje[] {
    return [...this.mensajes];
  }
}

// ---------------------------------------------------------------------------

class TasaSimulada implements AdaptadorTasa {
  readonly id = 'tasa.simulada';
  readonly descripcion = 'Tasa BCV de demostracion. No consulta el portal del BCV.';
  readonly simulado = true;

  async obtener() {
    await espera(200);
    return { valor: 51.87, fecha: new Date().toISOString(), fuente: 'BCV (simulado)' };
  }
}

// ---------------------------------------------------------------------------

class MfaSimulado implements AdaptadorMfa {
  readonly id = 'mfa.simulado';
  readonly descripcion = `Segundo factor de demostracion. El codigo valido siempre es ${CODIGO_MFA_DEMO}.`;
  readonly simulado = true;

  async emitirCodigo(_usuarioId: string) {
    await espera(250);
    return { pista: `Modo demostracion: introduzca ${CODIGO_MFA_DEMO}` };
  }

  async verificar(_usuarioId: string, codigo: string) {
    await espera(250);
    return codigo.trim() === CODIGO_MFA_DEMO;
  }
}

// ---------------------------------------------------------------------------

class ArchivosSimulado implements AdaptadorArchivos {
  readonly id = 'archivos.simulado';
  readonly descripcion = 'Guarda las evidencias en memoria del navegador. No sube nada a un servidor.';
  readonly simulado = true;

  private n = 0;

  async guardar(nombre: string, contenido: Blob | string) {
    this.n += 1;
    const url =
      typeof contenido === 'string'
        ? `data:text/plain;base64,${btoaSeguro(contenido)}`
        : URL.createObjectURL(contenido);
    return { id: `ev_${this.n}`, nombre, url };
  }
}

function btoaSeguro(s: string): string {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(s)));
  // Entorno sin `btoa` (pruebas en Node): se resuelve sin depender de tipos
  // de Node para no arrastrar @types/node a una demo de navegador.
  const g = globalThis as unknown as { Buffer?: { from(d: string, e: string): { toString(e: string): string } } };
  return g.Buffer ? g.Buffer.from(s, 'utf-8').toString('base64') : s;
}

// ---------------------------------------------------------------------------

export const adaptadores: Adaptadores = {
  banco: new BancoSimulado(),
  fiscal: new FiscalSimulado(),
  mensajeria: new MensajeriaSimulada(),
  tasa: new TasaSimulada(),
  mfa: new MfaSimulado(),
  archivos: new ArchivosSimulado(),
};

/** Inventario para la documentacion tecnica y el indice interno. */
export function inventarioAdaptadores() {
  return Object.entries(adaptadores).map(([clave, a]) => ({
    clave,
    id: a.id,
    descripcion: a.descripcion,
    simulado: a.simulado,
  }));
}
