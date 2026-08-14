import { describe, expect, it } from 'vitest';
import {
  TransicionInvalida,
  exigirFactura,
  exigirLiquidacion,
  exigirOrden,
  exigirPago,
  facturaPuedeIr,
  liquidacionPuedeIr,
  ordenPuedeIr,
  pagoPuedeIr,
} from '../src/domain/state-machines';
import {
  OperacionProhibida,
  UMBRAL_REEMBOLSO_ALTO_USD,
  exigirMutable,
  requisitosDe,
  validarAccion,
} from '../src/domain/sensitive-actions';
import { comprobarInmutabilidad, consultar, registrar } from '../src/data/audit';
import { construirEstadoInicial, TASA_BCV_INICIAL, resumenSeed } from '../src/data/seed';
import { calcularParticipacion, calcularTotales, usdAVes } from '../src/domain/money';
import { resolverAmbito, alcanzaParque, filtrarPorAmbito } from '../src/domain/scope';

describe('los cuatro procesos avanzan por separado', () => {
  it('la orden sigue su propia secuencia', () => {
    expect(ordenPuedeIr('creada', 'pendiente_aceptacion')).toBe(true);
    expect(ordenPuedeIr('lista', 'entregada')).toBe(true);
    expect(ordenPuedeIr('creada', 'entregada')).toBe(false);
    expect(ordenPuedeIr('entregada', 'preparando')).toBe(false);
  });

  it('el pago no depende del estado de la orden', () => {
    expect(pagoPuedeIr('iniciado', 'pendiente_verificacion')).toBe(true);
    expect(pagoPuedeIr('pendiente_verificacion', 'confirmado')).toBe(true);
    expect(pagoPuedeIr('iniciado', 'confirmado')).toBe(false);
    expect(pagoPuedeIr('reembolsado', 'confirmado')).toBe(false);
  });

  it('una factura emitida solo se corrige con nota', () => {
    expect(facturaPuedeIr('emitida', 'nota_credito')).toBe(true);
    expect(facturaPuedeIr('emitida', 'anulada')).toBe(false);
    expect(facturaPuedeIr('emitida', 'pendiente')).toBe(false);
  });

  it('una liquidacion cerrada es estado terminal', () => {
    expect(liquidacionPuedeIr('conciliada', 'cerrada')).toBe(true);
    expect(liquidacionPuedeIr('cerrada', 'conciliada')).toBe(false);
    expect(liquidacionPuedeIr('cerrada', 'por_cobrar')).toBe(false);
  });

  it('las transiciones invalidas lanzan un error explicito', () => {
    expect(() => exigirOrden('creada', 'entregada')).toThrow(TransicionInvalida);
    expect(() => exigirPago('confirmado', 'iniciado')).toThrow(TransicionInvalida);
    expect(() => exigirFactura('anulada', 'emitida')).toThrow(TransicionInvalida);
    expect(() => exigirLiquidacion('cerrada', 'calculada')).toThrow(TransicionInvalida);
  });

  it('una orden entregada puede convivir con un pago sin verificar', () => {
    const e = construirEstadoInicial();
    const orden = e.ordenes.find((o) => o.id === 'or_1002')!;
    const pago = e.pagos.find((p) => p.ordenId === 'or_1002')!;
    expect(orden.estado).toBe('lista');
    expect(pago.estado).toBe('pendiente_verificacion');
  });
});

describe('acciones sensibles', () => {
  it('el cambio de cuenta bancaria exige motivo, evidencia, MFA y doble aprobacion', () => {
    const r = requisitosDe('bancario.cambiar_cuenta');
    expect(r).toMatchObject({ confirmacion: true, motivo: true, evidencia: true, mfa: true, dobleAprobacion: true });
  });

  it('rechaza el cambio bancario cuando falta algo y detalla que falta', () => {
    const r = validarAccion({ accion: 'bancario.cambiar_cuenta', rol: 'comercio.propietario', motivo: 'Cambio de banco' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.faltan).toContain('evidencia');
      expect(r.faltan).toContain('mfa');
      expect(r.faltan).toContain('aprobacion');
    }
  });

  it('acepta el cambio bancario con todos los requisitos cubiertos', () => {
    const r = validarAccion({
      accion: 'bancario.cambiar_cuenta',
      rol: 'comercio.propietario',
      motivo: 'Cierre de la cuenta anterior',
      evidencia: 'carta-banco.pdf',
      mfaVerificado: true,
      aprobadoPor: { usuarioId: 'us_direccion', rol: 'inparques.direccion_comercial' },
    });
    expect(r.ok).toBe(true);
  });

  it('un reembolso alto pasa a exigir doble aprobacion', () => {
    expect(requisitosDe('reembolso.aprobar', { montoUsd: 5 }).dobleAprobacion).toBe(false);
    expect(requisitosDe('reembolso.aprobar', { montoUsd: UMBRAL_REEMBOLSO_ALTO_USD }).dobleAprobacion).toBe(true);
  });

  // La segregacion de funciones es entre personas, no entre cargos: dos
  // personas del mismo cargo son cuatro ojos; una sola persona no lo es por
  // mucho cargo que tenga.
  it('nadie puede aprobarse a si mismo', () => {
    const r = validarAccion({
      accion: 'finanzas.ajuste',
      rol: 'inparques.finanzas',
      usuarioId: 'us_finanzas',
      motivo: 'Diferencia de caja',
      evidencia: 'acta.pdf',
      mfaVerificado: true,
      aprobadoPor: { usuarioId: 'us_finanzas', rol: 'inparques.finanzas' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.faltan).toContain('aprobacion');
  });

  it('dos personas del mismo cargo si se aprueban entre si', () => {
    const r = validarAccion({
      accion: 'finanzas.ajuste',
      rol: 'inparques.finanzas',
      usuarioId: 'us_finanzas',
      motivo: 'Diferencia de caja',
      evidencia: 'acta.pdf',
      mfaVerificado: true,
      aprobadoPor: { usuarioId: 'us_finanzas_2', rol: 'inparques.finanzas' },
    });
    expect(r.ok).toBe(true);
  });

  // Con la regla anterior —aprobador de *otro cargo*— estas dos acciones eran
  // imposibles: solo admiten aprobadores superadmin, asi que un superadmin no
  // tenia ningun aprobador valido y la accion quedaba muerta.
  for (const accion of ['usuario.cambiar_rol', 'reglas.editar'] as const) {
    it(`un superadmin puede completar ${accion} con la firma de otro`, () => {
      const r = validarAccion({
        accion,
        rol: 'inparques.superadmin',
        usuarioId: 'us_superadmin',
        motivo: 'Rotacion de personal',
        evidencia: 'memo.pdf',
        mfaVerificado: true,
        aprobadoPor: { usuarioId: 'us_superadmin_2', rol: 'inparques.superadmin' },
      });
      expect(r.ok).toBe(true);
    });

    it(`${accion} sigue bloqueada si la firma es de la misma persona`, () => {
      const r = validarAccion({
        accion,
        rol: 'inparques.superadmin',
        usuarioId: 'us_superadmin',
        motivo: 'Rotacion de personal',
        evidencia: 'memo.pdf',
        mfaVerificado: true,
        aprobadoPor: { usuarioId: 'us_superadmin', rol: 'inparques.superadmin' },
      });
      expect(r.ok).toBe(false);
    });
  }
});

describe('registros que no se borran ni se editan', () => {
  it('bloquea el borrado de la bitacora, cierres y facturas emitidas', () => {
    for (const entidad of ['auditoria', 'cierre', 'liquidacion_cerrada', 'factura_emitida', 'pago_confirmado']) {
      expect(() => exigirMutable(entidad, 'borrar')).toThrow(OperacionProhibida);
      expect(() => exigirMutable(entidad, 'editar')).toThrow(OperacionProhibida);
    }
  });

  it('el mensaje indica la via correcta de correccion', () => {
    try {
      exigirMutable('factura_emitida', 'editar');
      throw new Error('deberia haber fallado');
    } catch (e) {
      expect((e as Error).message).toContain('nota de credito');
    }
  });

  it('permite operar sobre entidades normales', () => {
    expect(() => exigirMutable('articulo', 'editar')).not.toThrow();
  });

  it('la bitacora es append-only', () => {
    expect(() => comprobarInmutabilidad('auditoria', 'borrar')).toThrow();
  });
});

describe('bitacora de auditoria', () => {
  const usuario = {
    id: 'us_finanzas', nombre: 'Rosa Marcano', rol: 'inparques.finanzas' as const,
    scope: { level: 'nacional' as const, ids: [] },
  };

  it('conserva quien, que, cuando, motivo y evidencia', () => {
    const e = construirEstadoInicial();
    registrar(e, {
      usuario, accion: 'liquidacion.cerrar', entidad: 'liquidacion', entidadId: 'lq_1',
      motivo: 'Cierre mensual', evidencia: 'acta.pdf', mfaVerificado: true, aprobadoPor: 'us_superadmin',
    });
    const [ev] = consultar(e, { entidad: 'liquidacion' });
    expect(ev.usuarioNombre).toBe('Rosa Marcano');
    expect(ev.motivo).toBe('Cierre mensual');
    expect(ev.evidencia).toBe('acta.pdf');
    expect(ev.mfaVerificado).toBe(true);
    expect(ev.aprobadoPor).toBe('us_superadmin');
    expect(ev.en).toBeTruthy();
  });

  it('filtra por rol, entidad y texto', () => {
    const e = construirEstadoInicial();
    registrar(e, { usuario, accion: 'reembolso.aprobar', entidad: 'reembolso', entidadId: 'rb_1', motivo: 'Producto agotado' });
    registrar(e, { usuario, accion: 'ajuste.crear', entidad: 'ajuste', entidadId: 'aj_1', motivo: 'Diferencia' });
    expect(consultar(e, { entidad: 'reembolso' })).toHaveLength(1);
    expect(consultar(e, { texto: 'agotado' })).toHaveLength(1);
    expect(consultar(e, { rol: 'inparques.finanzas' })).toHaveLength(2);
    expect(consultar(e, { rol: 'inparques.inspector' })).toHaveLength(0);
  });
});

describe('regla monetaria', () => {
  it('una venta historica conserva su tasa aunque cambie la global', () => {
    const e = construirEstadoInicial();
    const julio = e.ordenes.find((o) => o.id === 'or_0987')!;
    const agosto = e.ordenes.find((o) => o.id === 'or_1001')!;

    expect(julio.tasaBcv).toBe(49.4);
    expect(agosto.tasaBcv).toBe(51.12);
    expect(e.tasaBcv.valor).toBe(TASA_BCV_INICIAL.valor);

    // Aunque la tasa global suba, el monto pagadero de julio no se recalcula.
    e.tasaBcv.valor = 99;
    expect(julio.totalVes).toBe(usdAVes(julio.totalUsd, 49.4));
  });

  it('separa base, impuesto y total', () => {
    const t = calcularTotales([{ cantidad: 1, precioUnitarioUsd: 10, extrasUsd: 0 }], 50);
    expect(t.subtotalUsd).toBe(10);
    expect(t.impuestosUsd).toBe(1.6);
    expect(t.totalUsd).toBe(11.6);
    expect(t.totalVes).toBe(580);
  });

  it('calcula canon y comision por separado y respeta el minimo garantizado', () => {
    const contrato = { canonFijoUsd: 120, porcentajeSobreVenta: 8, minimoGarantizadoUsd: 150 };
    const alto = calcularParticipacion(1000, contrato);
    expect(alto.comisionUsd).toBe(80);
    expect(alto.canonUsd).toBe(120);
    expect(alto.totalUsd).toBe(200);

    const bajo = calcularParticipacion(10, contrato);
    expect(bajo.totalUsd).toBe(150);
  });
});

describe('ambito de datos', () => {
  const e = construirEstadoInicial();

  it('el administrador de parque solo alcanza su parque', () => {
    const u = e.usuarios.find((x) => x.id === 'us_admin_parque')!;
    const a = resolverAmbito(u, e);
    expect(a.nacional).toBe(false);
    expect(alcanzaParque(a, 'pq_este')).toBe(true);
    expect(alcanzaParque(a, 'pq_avila')).toBe(false);
  });

  it('el usuario de comercio solo alcanza sus locales', () => {
    const u = e.usuarios.find((x) => x.id === 'us_operador_cedros')!;
    const a = resolverAmbito(u, e);
    expect(a.localIds).toEqual(['lc_cedros_jc']);
    const ordenes = filtrarPorAmbito(e.ordenes, a);
    expect(ordenes.every((o) => o.localId === 'lc_cedros_jc')).toBe(true);
    expect(ordenes.some((o) => o.localId === 'lc_orinoco_ai')).toBe(false);
  });

  it('el ambito nacional ve todo', () => {
    const u = e.usuarios.find((x) => x.id === 'us_superadmin')!;
    const a = resolverAmbito(u, e);
    expect(a.nacional).toBe(true);
    expect(filtrarPorAmbito(e.ordenes, a)).toHaveLength(e.ordenes.length);
  });
});

describe('datos de demostracion', () => {
  it('la venta de mostrador existe y esta en el mismo libro que las de la app', () => {
    const r = resumenSeed(construirEstadoInicial());
    expect(r.ventasMostrador).toBeGreaterThan(0);
    expect(r.ordenes).toBeGreaterThan(r.ventasMostrador);
  });

  it('incluye facturas emitidas y una liquidacion cerrada', () => {
    const r = resumenSeed(construirEstadoInicial());
    expect(r.facturasEmitidas).toBeGreaterThan(0);
    expect(r.liquidacionesCerradas).toBeGreaterThan(0);
  });

  it('el parque piloto tiene las cuatro zonas previstas', () => {
    const e = construirEstadoInicial();
    const zonas = e.zonas.filter((z) => z.parqueId === 'pq_este').map((z) => z.nombre);
    expect(zonas).toEqual(['Entrada Norte', 'Lago', 'Jardín Central', 'Área Infantil']);
  });

  it('cada local referencia un punto y un parque existentes', () => {
    const e = construirEstadoInicial();
    for (const l of e.locales) {
      expect(e.puntos.some((p) => p.id === l.puntoId), `punto de ${l.id}`).toBe(true);
      expect(e.parques.some((p) => p.id === l.parqueId), `parque de ${l.id}`).toBe(true);
      expect(e.negocios.some((n) => n.id === l.negocioId), `negocio de ${l.id}`).toBe(true);
    }
  });

  it('ningun local ofrece delivery', () => {
    const e = construirEstadoInicial();
    for (const l of e.locales) {
      expect(Object.keys(l.cumplimiento).sort()).toEqual(['mesa', 'retiroInmediato', 'retiroProgramado']);
    }
  });
});
