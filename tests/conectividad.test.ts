import { beforeEach, describe, expect, it } from 'vitest';
import { conectividad } from '../src/net/connectivity';
import { colaSincronizacion } from '../src/net/sync-queue';
import { adaptadores } from '../src/adapters/simulados';

describe('modos de conexion', () => {
  beforeEach(() => {
    conectividad.establecer('conectado');
    colaSincronizacion.vaciar();
  });

  it('alterna entre conectado, degradado y sin conexion', () => {
    expect(conectividad.actual()).toBe('conectado');
    expect(conectividad.alternarDemo()).toBe('degradado');
    expect(conectividad.alternarDemo()).toBe('sin_conexion');
    expect(conectividad.alternarDemo()).toBe('conectado');
  });

  it('no promete pago, factura ni liquidacion sin conexion', () => {
    conectividad.establecer('sin_conexion');
    expect(conectividad.puedePrometer('pago_confirmado')).toBe(false);
    expect(conectividad.puedePrometer('factura_emitida')).toBe(false);
    expect(conectividad.puedePrometer('liquidacion_conciliada')).toBe(false);
  });

  it('tampoco lo promete en modo degradado', () => {
    conectividad.establecer('degradado');
    expect(conectividad.puedePrometer('pago_confirmado')).toBe(false);
  });
});

describe('cola de sincronizacion', () => {
  beforeEach(() => {
    colaSincronizacion.vaciar();
    conectividad.establecer('conectado');
  });

  it('no duplica la misma accion sobre la misma version', () => {
    const a = colaSincronizacion.encolar('orden.aceptar', 'or_1002', {}, 'pendiente_aceptacion');
    const b = colaSincronizacion.encolar('orden.aceptar', 'or_1002', {}, 'pendiente_aceptacion');
    expect(a.id).toBe(b.id);
    expect(colaSincronizacion.listar()).toHaveLength(1);
  });

  it('no sincroniza mientras no hay red', async () => {
    colaSincronizacion.configurar(() => 'pendiente_aceptacion', () => {});
    colaSincronizacion.encolar('orden.aceptar', 'or_1002', {}, 'pendiente_aceptacion');
    conectividad.establecer('sin_conexion');
    const r = await colaSincronizacion.sincronizar();
    expect(r.sincronizadas).toBe(0);
    expect(colaSincronizacion.pendientes()).toHaveLength(1);
  });

  it('aplica las acciones cuando vuelve la conexion', async () => {
    const aplicadas: string[] = [];
    colaSincronizacion.configurar(
      () => 'pendiente_aceptacion',
      (a) => aplicadas.push(a.entidadId),
    );
    colaSincronizacion.encolar('orden.aceptar', 'or_1002', {}, 'pendiente_aceptacion');

    conectividad.establecer('sin_conexion');
    await colaSincronizacion.sincronizar();
    expect(aplicadas).toHaveLength(0);

    conectividad.establecer('conectado');
    const r = await colaSincronizacion.sincronizar();
    expect(r.sincronizadas).toBe(1);
    expect(aplicadas).toEqual(['or_1002']);
  });

  it('detecta el conflicto cuando el registro cambio mientras tanto', async () => {
    colaSincronizacion.configurar(() => 'entregada', () => {});
    colaSincronizacion.encolar('orden.aceptar', 'or_1002', {}, 'pendiente_aceptacion');

    const r = await colaSincronizacion.sincronizar();
    expect(r.sincronizadas).toBe(0);
    expect(r.conflictos).toHaveLength(1);
    expect(r.conflictos[0].valorEsperado).toBe('pendiente_aceptacion');
    expect(r.conflictos[0].valorActual).toBe('entregada');
    expect(colaSincronizacion.conflictos()).toHaveLength(1);
  });

  it('permite descartar o reintentar un conflicto sobre el estado actual', async () => {
    let estadoActual = 'entregada';
    const aplicadas: string[] = [];
    colaSincronizacion.configurar(
      () => estadoActual,
      (a) => aplicadas.push(a.entidadId),
    );
    const a = colaSincronizacion.encolar('orden.aceptar', 'or_1002', {}, 'pendiente_aceptacion');
    await colaSincronizacion.sincronizar();
    expect(colaSincronizacion.conflictos()).toHaveLength(1);

    colaSincronizacion.forzar(a.id);
    estadoActual = 'entregada';
    const r = await colaSincronizacion.sincronizar();
    expect(r.sincronizadas).toBe(1);
    expect(aplicadas).toEqual(['or_1002']);

    colaSincronizacion.limpiarSincronizadas();
    expect(colaSincronizacion.listar()).toHaveLength(0);
  });

  it('marca error cuando el registro ya no existe', async () => {
    colaSincronizacion.configurar(() => null, () => {});
    colaSincronizacion.encolar('orden.aceptar', 'or_borrada', {}, 'creada');
    const r = await colaSincronizacion.sincronizar();
    expect(r.errores).toBe(1);
  });
});

describe('adaptadores simulados', () => {
  it('todos se declaran como simulados', () => {
    for (const a of Object.values(adaptadores)) {
      expect(a.simulado).toBe(true);
      expect(a.id).toBeTruthy();
    }
  });

  it('el pago movil nace pendiente de verificacion, nunca confirmado de entrada', async () => {
    const r = await adaptadores.banco.crearIntencion({
      ordenId: 'or_x', montoVes: 100, metodo: 'pago_movil',
      referencia: '123456', claveIdempotencia: 'idem_x',
    });
    expect(r.estado).toBe('pendiente_verificacion');
  });

  it('la misma clave de idempotencia no cobra dos veces', async () => {
    const i = {
      ordenId: 'or_y', montoVes: 100, metodo: 'pago_movil' as const,
      referencia: '999999', claveIdempotencia: 'idem_unico',
    };
    const a = await adaptadores.banco.crearIntencion(i);
    const b = await adaptadores.banco.crearIntencion(i);
    expect(a).toEqual(b);
  });

  it('la referencia de prueba con ceros produce un fallo controlado', async () => {
    const r = await adaptadores.banco.crearIntencion({
      ordenId: 'or_z', montoVes: 100, metodo: 'transferencia',
      referencia: '000000', claveIdempotencia: 'idem_z',
    });
    expect(r.estado).toBe('fallido');
  });

  it('la mensajeria no envia nada: solo registra en una bandeja local', async () => {
    await adaptadores.mensajeria.enviar({ canal: 'sms', destino: '04141234567', cuerpo: 'Su pedido esta listo' });
    expect(adaptadores.mensajeria.bandeja().length).toBeGreaterThan(0);
  });

  it('el MFA simulado acepta solo el codigo documentado', async () => {
    expect(await adaptadores.mfa.verificar('us_x', '123456')).toBe(true);
    expect(await adaptadores.mfa.verificar('us_x', '000000')).toBe(false);
  });
});
