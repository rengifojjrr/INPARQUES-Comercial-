/**
 * La segunda firma, fijada.
 *
 * Es el control que peor estaba: existia en el formulario —motivo, evidencia,
 * MFA— y no en la realidad, porque la firma del segundo aprobador venia
 * escrita en el codigo (`us_direccion`, `us_superadmin`) y la interfaz no
 * preguntaba nunca quien aprobaba. Estas pruebas fijan que ahora hace falta
 * una persona distinta de verdad.
 */

import { describe, expect, it } from 'vitest';
import { puedeFirmar, porQueNoPuedeFirmar, pendientesPara } from '../src/domain/approvals';
import { construirEstadoInicial } from '../src/data/seed';
import { clientePuedeCancelar } from '../src/domain/state-machines';
import type { DemoState, SolicitudAprobacion, User } from '../src/domain/types';

const base = construirEstadoInicial();
const usuario = (id: string): User => base.usuarios.find((u) => u.id === id)!;

function solicitud(over: Partial<SolicitudAprobacion> = {}): SolicitudAprobacion {
  return {
    id: 'ap_1',
    accion: 'bancario.cambiar_cuenta',
    resumen: 'Cambio de cuenta bancaria',
    carga: {},
    entidad: 'negocio',
    entidadId: 'ng_cedros',
    solicitadaPor: 'us_prop_cedros',
    solicitadaPorNombre: 'Propietario',
    solicitadaPorRol: 'comercio.propietario',
    solicitadaEn: new Date().toISOString(),
    motivo: 'Cambio de banco',
    evidencia: 'acta.pdf',
    mfaVerificado: true,
    aprobadores: ['inparques.direccion_comercial', 'inparques.superadmin'],
    estado: 'pendiente',
    ...over,
  };
}

describe('quién puede firmar una solicitud', () => {
  it('una persona distinta con rol aprobador, sí', () => {
    expect(puedeFirmar(solicitud(), usuario('us_direccion'))).toBe(true);
    expect(puedeFirmar(solicitud(), usuario('us_superadmin'))).toBe(true);
  });

  it('quien la pidió, no — ni siquiera si su rol está habilitado', () => {
    const s = solicitud({ solicitadaPor: 'us_direccion', solicitadaPorRol: 'inparques.direccion_comercial' });
    expect(puedeFirmar(s, usuario('us_direccion'))).toBe(false);
    expect(porQueNoPuedeFirmar(s, usuario('us_direccion'))).toMatch(/su propia solicitud/i);
  });

  it('un rol no habilitado, no', () => {
    expect(puedeFirmar(solicitud(), usuario('us_operador_cedros'))).toBe(false);
    expect(puedeFirmar(solicitud(), usuario('us_inspector'))).toBe(false);
  });

  it('sin sesión, no', () => {
    expect(puedeFirmar(solicitud(), null)).toBe(false);
  });

  it('una solicitud ya resuelta no se vuelve a firmar', () => {
    for (const estado of ['aprobada', 'rechazada'] as const) {
      expect(puedeFirmar(solicitud({ estado }), usuario('us_direccion'))).toBe(false);
    }
  });
});

describe('la bandeja de cada quien', () => {
  const estado: DemoState = { ...base, aprobaciones: [solicitud(), solicitud({ id: 'ap_2', aprobadores: ['inparques.finanzas'] })] };

  it('muestra solo lo que esa persona puede firmar', () => {
    expect(pendientesPara(estado, usuario('us_direccion')).map((s) => s.id)).toEqual(['ap_1']);
    expect(pendientesPara(estado, usuario('us_finanzas')).map((s) => s.id)).toEqual(['ap_2']);
    expect(pendientesPara(estado, usuario('us_superadmin')).map((s) => s.id)).toEqual(['ap_1']);
    expect(pendientesPara(estado, usuario('us_operador_cedros'))).toEqual([]);
  });
});

describe('cancelación del cliente', () => {
  it('sigue limitada a antes de la aceptación', () => {
    expect(clientePuedeCancelar('pendiente_aceptacion')).toBe(true);
    expect(clientePuedeCancelar('aceptada')).toBe(false);
  });
});
