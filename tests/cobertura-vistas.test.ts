import { describe, expect, it } from 'vitest';
import { VISTAS, resumenCobertura } from '../src/app/registry';
import { VISTAS_POR_ID } from '../src/ui/vistas';
import { ROLE_IDS, ROLES } from '../src/domain/roles';
import { emparejar, inicioDeRol } from '../src/app/router';

describe('cobertura del registro de vistas', () => {
  it('toda ruta registrada tiene una vista que la dibuja', () => {
    const sinVista = VISTAS.filter((v) => !VISTAS_POR_ID[v.id]).map((v) => `${v.id} (${v.ruta})`);
    expect(sinVista, `rutas sin vista asociada: ${sinVista.join(', ')}`).toEqual([]);
  });

  it('no hay vistas declaradas para rutas que no existen', () => {
    const ids = new Set(VISTAS.map((v) => v.id));
    const huerfanas = Object.keys(VISTAS_POR_ID).filter((id) => !ids.has(id));
    expect(huerfanas, `vistas sin ruta: ${huerfanas.join(', ')}`).toEqual([]);
  });

  it('cada rol tiene un inicio alcanzable', () => {
    for (const rol of ROLE_IDS) {
      const inicio = inicioDeRol(rol);
      const m = emparejar(inicio);
      expect(m, `${ROLES[rol].nombre} no tiene inicio`).not.toBeNull();
      expect(m!.vista.roles.length === 0 || m!.vista.roles.includes(rol)).toBe(true);
    }
  });

  it('cada rol alcanza al menos su inicio, su perfil y sus notificaciones', () => {
    for (const rol of ROLE_IDS) {
      for (const ruta of ['/perfil', '/notificaciones', '/ayuda']) {
        const m = emparejar(ruta)!;
        expect(m.vista.roles.includes(rol), `${rol} no alcanza ${ruta}`).toBe(true);
      }
    }
  });

  it('el resumen de cobertura cuadra con el registro', () => {
    const r = resumenCobertura();
    expect(r.total).toBe(VISTAS.length);
    const suma = r.porSuperficie.compartida + r.porSuperficie.visitante + r.porSuperficie.comercio + r.porSuperficie.inparques;
    expect(suma).toBe(r.total);
  });

  it('ninguna ruta de producto usa el prefijo interno de desarrollo', () => {
    expect(VISTAS.filter((v) => v.ruta.startsWith('/__'))).toEqual([]);
  });
});
