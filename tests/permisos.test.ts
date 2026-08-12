import { describe, expect, it } from 'vitest';
import { ROLE_IDS, ROLES, ROLES_SIN_DATOS_BANCARIOS } from '../src/domain/roles';
import { puede, puedeVerBancario } from '../src/domain/permissions';
import { enmascararCuenta, proyectarCuenta } from '../src/domain/masking';
import { emparejar } from '../src/app/router';
import { VISTAS, vistasDeRol } from '../src/app/registry';
import type { CuentaBancaria } from '../src/domain/types';

describe('catalogo de roles', () => {
  it('define exactamente los once roles del documento', () => {
    expect(ROLE_IDS).toHaveLength(11);
  });

  it('exige MFA al personal institucional y a los propietarios', () => {
    for (const r of ROLE_IDS) {
      const institucional = ROLES[r].superficie === 'inparques';
      if (institucional || r === 'comercio.propietario') {
        expect(ROLES[r].requiereMfa, `${r} deberia exigir MFA`).toBe(true);
      }
    }
  });

  it('solo el visitante puede registrarse en publico', () => {
    const publicos = ROLE_IDS.filter((r) => !ROLES[r].soloPorInvitacion);
    expect(publicos).toEqual(['visitante.cliente']);
  });
});

describe('datos bancarios', () => {
  const cuenta: CuentaBancaria = {
    id: 'cb_x', negocioId: 'ng_x', banco: 'Banco Demo', titular: 'Demo, C.A.',
    numero: '01020304050607081234', tipo: 'corriente', verificada: true,
    actualizadaEn: '2026-08-01T00:00:00.000Z',
  };

  it('niega el dato a inspector, soporte, operador y administrador de parque', () => {
    for (const rol of ['inparques.inspector', 'inparques.soporte', 'comercio.operador', 'inparques.admin_parque'] as const) {
      expect(puedeVerBancario(rol), `${rol} no debe ver datos bancarios`).toBe(false);
      expect(proyectarCuenta(cuenta, rol)).toEqual({ visible: false });
    }
  });

  it('coincide con la lista declarada de roles sin acceso bancario', () => {
    expect(ROLES_SIN_DATOS_BANCARIOS).toEqual(
      expect.arrayContaining(['inparques.inspector', 'inparques.soporte', 'comercio.operador', 'inparques.admin_parque']),
    );
  });

  it('entrega el numero enmascarado a los roles autorizados', () => {
    const p = proyectarCuenta(cuenta, 'inparques.finanzas');
    expect(p.visible).toBe(true);
    if (p.visible) {
      expect(p.numeroEnmascarado).toBe('•••• •••• •••• 1234');
      expect(p.numeroEnmascarado).not.toContain('0102030405');
    }
  });

  it('nunca expone el numero completo en ninguna proyeccion', () => {
    for (const rol of ROLE_IDS) {
      const p = proyectarCuenta(cuenta, rol);
      if (p.visible) expect(p.numeroEnmascarado).not.toBe(cuenta.numero);
    }
  });

  it('enmascara dejando solo los ultimos cuatro digitos', () => {
    expect(enmascararCuenta('01020304050607081234')).toMatch(/1234$/);
    expect(enmascararCuenta('12')).toBe('••••');
  });
});

describe('registro de vistas y rutas', () => {
  it('no tiene rutas duplicadas', () => {
    const rutas = VISTAS.map((v) => v.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  it('no tiene identificadores duplicados', () => {
    const ids = VISTAS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('empareja rutas con parametros sin capturar rutas hermanas', () => {
    expect(emparejar('/c/pedidos')?.vista.id).toBe('c.pedidos');
    const detalle = emparejar('/c/pedido/or_1001');
    expect(detalle?.vista.id).toBe('c.pedido');
    expect(detalle?.params.ordenId).toBe('or_1001');
  });

  it('devuelve nulo para una ruta inexistente', () => {
    expect(emparejar('/no/existe')).toBeNull();
  });

  it('el operador no alcanza ninguna vista de finanzas del comercio', () => {
    const suyas = vistasDeRol('comercio.operador').map((v) => v.ruta);
    for (const prohibida of ['/c/contratos', '/c/cobro/cuenta-bancaria', '/c/estado-cuenta', '/c/conciliacion', '/c/facturas']) {
      expect(suyas, `el operador no debe alcanzar ${prohibida}`).not.toContain(prohibida);
    }
  });

  it('el inspector no alcanza modulos financieros institucionales', () => {
    const suyas = vistasDeRol('inparques.inspector').map((v) => v.ruta);
    for (const prohibida of ['/i/contabilidad', '/i/conciliacion', '/i/cierres', '/i/reglas', '/i/usuarios']) {
      expect(suyas, `el inspector no debe alcanzar ${prohibida}`).not.toContain(prohibida);
    }
  });

  it('el administrador de parque no alcanza cierres ni reglas globales', () => {
    const suyas = vistasDeRol('inparques.admin_parque').map((v) => v.ruta);
    expect(suyas).not.toContain('/i/cierres');
    expect(suyas).not.toContain('/i/reglas');
  });

  it('cada vista privada declara al menos un rol existente', () => {
    for (const v of VISTAS) {
      for (const r of v.roles) expect(ROLE_IDS).toContain(r);
    }
  });
});

describe('permisos por modulo', () => {
  it('el operador puede operar pedidos pero no editar contratos', () => {
    expect(puede('comercio.operador', 'orden:aceptar')).toBe(true);
    expect(puede('comercio.operador', 'contrato:editar')).toBe(false);
    expect(puede('comercio.operador', 'finanzas:ver')).toBe(false);
  });

  it('finanzas aprueba reembolsos y soporte solo los solicita', () => {
    expect(puede('inparques.finanzas', 'reembolso:aprobar')).toBe(true);
    expect(puede('inparques.soporte', 'reembolso:aprobar')).toBe(false);
    expect(puede('inparques.soporte', 'reembolso:solicitar')).toBe(true);
  });

  it('el contador exporta pero no acepta pedidos', () => {
    expect(puede('comercio.contador', 'reporte:exportar')).toBe(true);
    expect(puede('comercio.contador', 'orden:aceptar')).toBe(false);
  });
});
