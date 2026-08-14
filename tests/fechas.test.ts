/**
 * Fechas y horas.
 *
 * Dos defectos que solo se veian mirando la pantalla con calma: una franja de
 * las nueve de la manana se mostraba a las cinco —porque se guardaba pegandole
 * una `Z` a una hora local, y todo usuario real de esto esta en UTC−4—, y el
 * selector de dia repetia el numero en vez de poner el dia de la semana.
 *
 * Y los datos de demostracion estaban clavados en una fecha fija, asi que la
 * demo envejecia sola: a los dos dias ya ofrecia horarios del pasado.
 */

import { describe, expect, it } from 'vitest';
import { instanteLocal, diaSemanaCorto } from '../src/ui/formato';
import { construirEstadoInicial } from '../src/data/seed';

describe('una franja es una hora local, no universal', () => {
  it('el instante guardado corresponde a esa hora en la zona del dispositivo', () => {
    const iso = instanteLocal('2026-08-14', '09:00');
    const d = new Date(iso);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
    expect(d.getDate()).toBe(14);
  });

  it('vuelve a leerse como la misma hora', () => {
    for (const hora of ['07:30', '09:00', '14:00', '23:45']) {
      const d = new Date(instanteLocal('2026-08-14', hora));
      const leida = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      expect(leida).toBe(hora);
    }
  });
});

describe('el selector de día muestra el día de la semana', () => {
  it('devuelve un nombre, no el número', () => {
    const dia = diaSemanaCorto('2026-08-14');
    expect(dia).not.toMatch(/^\d/);
    expect(dia.length).toBeGreaterThan(1);
  });
});

describe('los datos de demostración no envejecen', () => {
  const estado = construirEstadoInicial();
  const hoy = new Date().toISOString().slice(0, 10);

  it('ninguna franja de reserva queda en el pasado', () => {
    const pasadas = estado.franjas.filter((f) => f.fecha < hoy);
    expect(pasadas).toEqual([]);
  });

  it('la semana de reservas empieza hoy', () => {
    const fechas = [...new Set(estado.franjas.map((f) => f.fecha))].sort();
    expect(fechas[0]).toBe(hoy);
  });

  it('hay pedidos de hoy, para que las pantallas de "hoy" no salgan en cero', () => {
    const deHoy = estado.ordenes.filter((o) => o.creadaEn.slice(0, 10) === hoy);
    expect(deHoy.length).toBeGreaterThan(0);
  });

  it('la cola del operador tiene trabajo al entrar', () => {
    const enCola = estado.ordenes.filter(
      (o) => o.localId === 'lc_cedros_jc' && ['pendiente_aceptacion', 'preparando', 'lista'].includes(o.estado),
    );
    expect(enCola.length).toBeGreaterThan(0);
  });

  it('los permisos y documentos vencen en el futuro, no en el pasado', () => {
    for (const p of estado.permisos) expect(p.hasta >= hoy).toBe(true);
    for (const d of estado.documentos) {
      if (d.vigenciaHasta) expect(d.vigenciaHasta >= hoy).toBe(true);
    }
  });
});
